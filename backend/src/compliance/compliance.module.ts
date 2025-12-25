import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { Soc2ComplianceService } from './soc2-compliance.service';
import { Soc2ComplianceController } from './soc2-compliance.controller';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailController } from './audit-trail.controller';
import { EAuditExporterService } from './e-audit-exporter.service';
import { EAuditExporterController } from './e-audit-exporter.controller';
import { DocumentRetentionService } from './document-retention.service';
import { DocumentRetentionController } from './document-retention.controller';
import { ComplianceCalendarService } from './compliance-calendar.service';
import { ComplianceCalendarController } from './compliance-calendar.controller';
import { RegulatoryTrackerService } from './regulatory-tracker.service';
import { RegulatoryTrackerController } from './regulatory-tracker.controller';
import { RevisalService } from './revisal.service';
import { RevisalController } from './revisal.controller';
import { D112Service } from './d112.service';
import { D112Controller } from './d112.controller';
import { D394Service } from './d394.service';
import { D394Controller } from './d394.controller';
import { AnafStatusService } from './anaf-status.service';
import { AnafStatusController } from './anaf-status.controller';

@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot(), PrismaModule],
  controllers: [
    Soc2ComplianceController,
    AuditTrailController,
    EAuditExporterController,
    DocumentRetentionController,
    ComplianceCalendarController,
    RegulatoryTrackerController,
    RevisalController,
    D112Controller,
    D394Controller,
    AnafStatusController,
  ],
  providers: [
    Soc2ComplianceService,
    AuditTrailService,
    EAuditExporterService,
    DocumentRetentionService,
    ComplianceCalendarService,
    RegulatoryTrackerService,
    RevisalService,
    D112Service,
    D394Service,
    AnafStatusService,
  ],
  exports: [
    Soc2ComplianceService,
    AuditTrailService,
    EAuditExporterService,
    DocumentRetentionService,
    ComplianceCalendarService,
    RegulatoryTrackerService,
    RevisalService,
    D112Service,
    D394Service,
    AnafStatusService,
  ],
})
export class ComplianceModule {}
