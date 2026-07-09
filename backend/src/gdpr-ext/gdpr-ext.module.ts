import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { GdprExtService } from './gdpr-ext.service';
import { GdprExtController } from './gdpr-ext.controller';
import { GdprExtPublicController } from './gdpr-ext-public.controller';
import { GdprDsarService } from './gdpr-dsar.service';
import { GdprBreachService } from './gdpr-breach.service';

/** GDPR-EXT (S-61) — GDPR tooling sold to tenants (Track C MVP). */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GdprExtController, GdprExtPublicController],
  providers: [GdprExtService, GdprDsarService, GdprBreachService],
  exports: [GdprExtService, GdprDsarService, GdprBreachService],
})
export class GdprExtModule {}
