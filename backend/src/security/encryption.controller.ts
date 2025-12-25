import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { EncryptionService } from './encryption.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Security - Encryption')
@ApiBearerAuth()
@Controller('security/encryption')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  // =================== KEY MANAGEMENT ===================

  @Get('keys')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all encryption keys' })
  @ApiResponse({ status: 200, description: 'List of encryption keys' })
  listKeys() {
    return {
      keys: this.encryptionService.listKeys(),
    };
  }

  @Get('keys/current')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current active key info' })
  @ApiResponse({ status: 200, description: 'Current key information' })
  getCurrentKey() {
    const key = this.encryptionService.getCurrentKey();
    return {
      id: key.id,
      createdAt: key.createdAt,
      status: key.status,
      version: key.version,
    };
  }

  @Post('keys/rotate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Rotate encryption key' })
  @ApiResponse({ status: 200, description: 'Key rotation result' })
  async rotateKey() {
    return this.encryptionService.rotateKey();
  }

  @Delete('keys/:keyId/revoke')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke an encryption key' })
  @ApiResponse({ status: 200, description: 'Key revoked' })
  revokeKey(@Param('keyId') keyId: string) {
    const success = this.encryptionService.revokeKey(keyId);
    return { success, keyId };
  }

  // =================== ENCRYPTION OPERATIONS ===================

  @Post('encrypt')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Encrypt data' })
  @ApiResponse({ status: 200, description: 'Encrypted data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        plaintext: { type: 'string' },
        keyId: { type: 'string' },
      },
      required: ['plaintext'],
    },
  })
  encrypt(
    @Body('plaintext') plaintext: string,
    @Body('keyId') keyId?: string,
  ) {
    return this.encryptionService.encrypt(plaintext, keyId);
  }

  @Post('decrypt')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Decrypt data' })
  @ApiResponse({ status: 200, description: 'Decrypted data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        encryptedData: {
          type: 'object',
          properties: {
            ciphertext: { type: 'string' },
            iv: { type: 'string' },
            tag: { type: 'string' },
            salt: { type: 'string' },
            algorithm: { type: 'string' },
            keyId: { type: 'string' },
            version: { type: 'number' },
          },
        },
      },
      required: ['encryptedData'],
    },
  })
  decrypt(@Body('encryptedData') encryptedData: any) {
    const plaintext = this.encryptionService.decrypt(encryptedData);
    return { plaintext };
  }

  @Post('encrypt-string')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Encrypt data to base64 string' })
  @ApiResponse({ status: 200, description: 'Encrypted string' })
  encryptToString(
    @Body('plaintext') plaintext: string,
    @Body('keyId') keyId?: string,
  ) {
    const encrypted = this.encryptionService.encryptToString(plaintext, keyId);
    return { encrypted };
  }

  @Post('decrypt-string')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Decrypt from base64 string' })
  @ApiResponse({ status: 200, description: 'Decrypted data' })
  decryptFromString(@Body('encrypted') encrypted: string) {
    const plaintext = this.encryptionService.decryptFromString(encrypted);
    return { plaintext };
  }

  // =================== FIELD-LEVEL ENCRYPTION ===================

  @Post('encrypt-fields')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Encrypt specific fields in an object' })
  @ApiResponse({ status: 200, description: 'Object with encrypted fields' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object' },
        fields: { type: 'array', items: { type: 'string' } },
        keyId: { type: 'string' },
      },
      required: ['data', 'fields'],
    },
  })
  encryptFields(
    @Body('data') data: Record<string, any>,
    @Body('fields') fields: string[],
    @Body('keyId') keyId?: string,
  ) {
    return this.encryptionService.encryptFields(data, fields, keyId);
  }

  @Post('decrypt-fields')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Decrypt specific fields in an object' })
  @ApiResponse({ status: 200, description: 'Object with decrypted fields' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object' },
        fields: { type: 'array', items: { type: 'string' } },
      },
      required: ['data', 'fields'],
    },
  })
  decryptFields(
    @Body('data') data: Record<string, any>,
    @Body('fields') fields: string[],
  ) {
    return this.encryptionService.decryptFields(data, fields);
  }

  @Post('encrypt-sensitive')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Auto-encrypt sensitive fields' })
  @ApiResponse({ status: 200, description: 'Object with encrypted sensitive fields' })
  encryptSensitiveFields(@Body('data') data: Record<string, any>) {
    return this.encryptionService.encryptSensitiveFields(data);
  }

  @Post('decrypt-sensitive')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Auto-decrypt sensitive fields' })
  @ApiResponse({ status: 200, description: 'Object with decrypted sensitive fields' })
  decryptSensitiveFields(@Body('data') data: Record<string, any>) {
    return this.encryptionService.decryptSensitiveFields(data);
  }

  // =================== ENVELOPE ENCRYPTION ===================

  @Post('envelope/encrypt')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Envelope encrypt large data' })
  @ApiResponse({ status: 200, description: 'Envelope encrypted data' })
  envelopeEncrypt(@Body('plaintext') plaintext: string) {
    return this.encryptionService.envelopeEncrypt(plaintext);
  }

  @Post('envelope/decrypt')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Decrypt envelope encrypted data' })
  @ApiResponse({ status: 200, description: 'Decrypted data' })
  envelopeDecrypt(
    @Body('encryptedData') encryptedData: string,
    @Body('encryptedDataKey') encryptedDataKey: string,
  ) {
    const plaintext = this.encryptionService.envelopeDecrypt(
      encryptedData,
      encryptedDataKey,
    );
    return { plaintext };
  }

  // =================== HASHING ===================

  @Post('hash')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create secure hash' })
  @ApiResponse({ status: 200, description: 'Hash and salt' })
  hash(@Body('data') data: string, @Body('salt') salt?: string) {
    return this.encryptionService.hash(data, salt);
  }

  @Post('hash/verify')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Verify hash' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  verifyHash(
    @Body('data') data: string,
    @Body('hash') hash: string,
    @Body('salt') salt: string,
  ) {
    const valid = this.encryptionService.verifyHash(data, hash, salt);
    return { valid };
  }

  @Post('hmac')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create HMAC' })
  @ApiResponse({ status: 200, description: 'HMAC value' })
  createHmac(@Body('data') data: string) {
    const hmac = this.encryptionService.createHmac(data);
    return { hmac };
  }

  @Post('hmac/verify')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Verify HMAC' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  verifyHmac(@Body('data') data: string, @Body('hmac') hmac: string) {
    const valid = this.encryptionService.verifyHmac(data, hmac);
    return { valid };
  }

  // =================== UTILITIES ===================

  @Get('token/:length')
  @ApiOperation({ summary: 'Generate secure random token' })
  @ApiResponse({ status: 200, description: 'Random token' })
  generateToken(@Param('length') length: string) {
    const token = this.encryptionService.generateToken(parseInt(length) || 32);
    return { token };
  }

  @Get('password/:length')
  @ApiOperation({ summary: 'Generate secure random password' })
  @ApiResponse({ status: 200, description: 'Random password' })
  generatePassword(@Param('length') length: string) {
    const password = this.encryptionService.generatePassword(parseInt(length) || 16);
    return { password };
  }

  @Post('check-encrypted')
  @ApiOperation({ summary: 'Check if data looks encrypted' })
  @ApiResponse({ status: 200, description: 'Check result' })
  isEncrypted(@Body('data') data: string) {
    const isEncrypted = this.encryptionService.isEncrypted(data);
    return { isEncrypted };
  }

  // =================== STATISTICS & COMPLIANCE ===================

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get encryption statistics' })
  @ApiResponse({ status: 200, description: 'Encryption statistics' })
  getStats() {
    return this.encryptionService.getStats();
  }

  @Post('stats/reset')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset encryption statistics' })
  @ApiResponse({ status: 200, description: 'Statistics reset' })
  resetStats() {
    this.encryptionService.resetStats();
    return { success: true };
  }

  @Get('compliance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get compliance information' })
  @ApiResponse({ status: 200, description: 'Compliance information' })
  getComplianceInfo() {
    return this.encryptionService.getComplianceInfo();
  }
}
