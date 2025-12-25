import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { ComplianceLoggingService } from './compliance-logging.service';
import { ComplianceLoggingController } from './compliance-logging.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [AuditController, ComplianceLoggingController],
  providers: [AuditService, ComplianceLoggingService],
  exports: [AuditService, ComplianceLoggingService],
})
export class AuditModule {}
