import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from './encryption.service';
import { EncryptionController } from './encryption.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ApiGatewayController } from './api-gateway.controller';
import { RateLimiterService } from './rate-limiter.service';
import { SecurityAuditService } from './security-audit.service';
import { SecurityAuditController } from './security-audit.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [EncryptionController, ApiGatewayController, SecurityAuditController],
  providers: [EncryptionService, ApiGatewayService, RateLimiterService, SecurityAuditService],
  exports: [EncryptionService, ApiGatewayService, RateLimiterService, SecurityAuditService],
})
export class SecurityModule {}
