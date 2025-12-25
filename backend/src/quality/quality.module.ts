import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { QualityControlService } from './quality-control.service';
import { NonConformanceService } from './non-conformance.service';
import { CAPAService } from './capa.service';
import { QualityDocumentsService } from './quality-documents.service';
import { SupplierQualityService } from './supplier-quality.service';
import { QualityAnalyticsService } from './quality-analytics.service';

// Controllers
import {
  QualityInspectionsController,
  QualityChecklistsController,
  DefectCodesController,
} from './quality-control.controller';
import { NonConformanceController } from './non-conformance.controller';
import { CAPAController } from './capa.controller';
import {
  QualityDocumentsController,
  CertificationsController,
} from './quality-documents.controller';
import { SupplierQualityController } from './supplier-quality.controller';
import {
  QualityKPIsController,
  QualityDashboardsController,
  QualityReportsController,
  QualityAlertsController,
  QualityAnalyticsController,
} from './quality-analytics.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    // Services
    QualityControlService,
    NonConformanceService,
    CAPAService,
    QualityDocumentsService,
    SupplierQualityService,
    QualityAnalyticsService,
  ],
  controllers: [
    // Quality Control
    QualityInspectionsController,
    QualityChecklistsController,
    DefectCodesController,

    // Non-Conformance
    NonConformanceController,

    // CAPA
    CAPAController,

    // Documents & Certifications
    QualityDocumentsController,
    CertificationsController,

    // Supplier Quality
    SupplierQualityController,

    // Analytics
    QualityKPIsController,
    QualityDashboardsController,
    QualityReportsController,
    QualityAlertsController,
    QualityAnalyticsController,
  ],
  exports: [
    QualityControlService,
    NonConformanceService,
    CAPAService,
    QualityDocumentsService,
    SupplierQualityService,
    QualityAnalyticsService,
  ],
})
export class QualityModule {}
