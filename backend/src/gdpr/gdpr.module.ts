import { Module } from '@nestjs/common';
import { GdprController } from './gdpr.controller';
import { AuditModule } from '../audit/audit.module';
import { GdprService } from './gdpr.service';
import { RetentionService } from './retention.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GdprController],
  providers: [GdprService, RetentionService],
  exports: [GdprService, RetentionService],
})
export class GdprModule {}
