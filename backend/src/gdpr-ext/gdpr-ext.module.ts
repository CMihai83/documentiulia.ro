import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { GdprExtService } from './gdpr-ext.service';
import { GdprExtController } from './gdpr-ext.controller';
import { GdprExtPublicController } from './gdpr-ext-public.controller';
import { GdprDsarService } from './gdpr-dsar.service';
import { GdprBreachService } from './gdpr-breach.service';
import { GdprDpiaVendorService } from './gdpr-dpia-vendor.service';
import { GdprTrainExportService } from './gdpr-train-export.service';

/** GDPR-EXT — GDPR tooling sold to tenants (S-61 MVP + S-62 MUSTs + S-63 Shoulds). */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GdprExtController, GdprExtPublicController],
  providers: [GdprExtService, GdprDsarService, GdprBreachService, GdprDpiaVendorService, GdprTrainExportService],
  exports: [GdprExtService, GdprDsarService, GdprBreachService, GdprDpiaVendorService, GdprTrainExportService],
})
export class GdprExtModule {}
